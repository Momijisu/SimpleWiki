<?php
/**
 * Log in with Discord, for members of one Discord server.
 *
 * A PluggableAuth plugin: the login button sends the person to Discord, Discord
 * sends them back to Special:PluggableAuthLogin with a one-time code, and this
 * class swaps the code for their Discord account and their membership of the
 * server (which includes their roles). Wiki accounts are linked to the Discord
 * account ID, so renaming either never breaks the link.
 *
 * Settings ($wgPluggableAuth_Config[...]['data']): clientId, clientSecret, guildId.
 * Group mapping uses PluggableAuth's "mapped" group sync with the attribute
 * "discord_roles" (a list of Discord role IDs). See README.md.
 */

namespace MediaWiki\Extension\DiscordLogin;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\PluggableAuth\PluggableAuth;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\SpecialPage\SpecialPage;
use MediaWiki\User\Options\UserOptionsManager;
use MediaWiki\User\UserIdentity;
use MediaWiki\User\UserIdentityLookup;
use MediaWiki\User\UserNameUtils;
use MediaWiki\MediaWikiServices;
use Wikimedia\Rdbms\IConnectionProvider;

class DiscordLogin extends PluggableAuth {

	/** User option holding the Discord account ID linked to a wiki account */
	public const OPTION = 'discordlogin-id';

	private const SESSION_STATE = 'discordlogin-state';
	private const SESSION_PENDING = 'discordlogin-pending';

	private HttpRequestFactory $http;
	private UserOptionsManager $userOptions;
	private IConnectionProvider $db;
	private UserNameUtils $userNameUtils;
	private UserIdentityLookup $userLookup;

	public function __construct(
		HttpRequestFactory $http,
		UserOptionsManager $userOptions,
		IConnectionProvider $db,
		UserNameUtils $userNameUtils,
		UserIdentityLookup $userLookup
	) {
		$this->http = $http;
		$this->userOptions = $userOptions;
		$this->db = $db;
		$this->userNameUtils = $userNameUtils;
		$this->userLookup = $userLookup;
	}

	/** A setting from 'data', with a default */
	private function setting( string $name, $default = null ) {
		$data = $this->getData();
		return $data->has( $name ) ? $data->get( $name ) : $default;
	}

	private function apiBase(): string {
		return rtrim( $this->setting( 'apiBase', 'https://discord.com/api/v10' ), '/' );
	}

	private function redirectUri(): string {
		return SpecialPage::getTitleFor( 'PluggableAuthLogin' )->getCanonicalURL();
	}

	/**
	 * Called twice: first to send the person to Discord, then again when Discord
	 * sends them back with ?code=...&state=...
	 */
	public function authenticate(
		?int &$id,
		?string &$username,
		?string &$realname,
		?string &$email,
		?string &$errorMessage
	): bool {
		$clientId = $this->setting( 'clientId' );
		$clientSecret = $this->setting( 'clientSecret' );
		$guildId = (string)$this->setting( 'guildId', '' );
		if ( !$clientId || !$clientSecret || $guildId === '' ) {
			$errorMessage = wfMessage( 'discordlogin-error-config' )->text();
			$this->getLogger()->error( 'DiscordLogin: clientId, clientSecret and guildId must be set' );
			return false;
		}

		$request = RequestContext::getMain()->getRequest();
		$session = $request->getSession();

		if ( $request->getVal( 'error' ) !== null ) {
			// They pressed Cancel on Discord's page
			$errorMessage = wfMessage( 'discordlogin-error-denied' )->text();
			return false;
		}

		$code = $request->getVal( 'code' );
		if ( $code === null ) {
			// First leg: send them to Discord
			$state = bin2hex( random_bytes( 16 ) );
			$session->set( self::SESSION_STATE, $state );
			$session->persist();
			$session->save();
			$url = $this->setting( 'authorizeUrl', 'https://discord.com/oauth2/authorize' ) . '?' .
				http_build_query( [
					'client_id' => $clientId,
					'redirect_uri' => $this->redirectUri(),
					'response_type' => 'code',
					'scope' => 'identify guilds.members.read',
					'state' => $state,
					'prompt' => 'none',
				] );
			header( 'Location: ' . $url );
			exit;
		}

		// Second leg: check the state, then swap the code for a token
		$expected = $session->get( self::SESSION_STATE );
		$session->remove( self::SESSION_STATE );
		if ( !$expected || !hash_equals( $expected, (string)$request->getVal( 'state' ) ) ) {
			$errorMessage = wfMessage( 'discordlogin-error-state' )->text();
			return false;
		}

		$token = $this->call( 'POST', '/oauth2/token', null, [
			'client_id' => $clientId,
			'client_secret' => $clientSecret,
			'grant_type' => 'authorization_code',
			'code' => $code,
			'redirect_uri' => $this->redirectUri(),
		] );
		if ( !isset( $token['access_token'] ) ) {
			$errorMessage = wfMessage( 'discordlogin-error-discord', 'token' )->text();
			return false;
		}
		$accessToken = $token['access_token'];

		$me = $this->call( 'GET', '/users/@me', $accessToken );
		if ( !isset( $me['id'] ) || !isset( $me['username'] ) ) {
			$errorMessage = wfMessage( 'discordlogin-error-discord', 'user' )->text();
			return false;
		}

		// Are they in the server? Checked at every login, so leaving or being
		// kicked from the server stops them logging in.
		$member = $this->call( 'GET', '/users/@me/guilds/' . rawurlencode( $guildId ) . '/member', $accessToken, null, $status );
		if ( $status === 404 || ( is_array( $member ) && ( $member['code'] ?? null ) === 10004 ) ) {
			$errorMessage = wfMessage( 'discordlogin-error-notmember' )->text();
			return false;
		}
		if ( !is_array( $member ) || !isset( $member['roles'] ) ) {
			$errorMessage = wfMessage( 'discordlogin-error-discord', 'member ' . $status )->text();
			return false;
		}
		if ( !empty( $member['pending'] ) ) {
			$errorMessage = wfMessage( 'discordlogin-error-pending' )->text();
			return false;
		}

		$discordId = (string)$me['id'];
		$roles = array_map( 'strval', $member['roles'] );
		// Kept in the session: group sync and saving the link for a new account
		// happen later in the login, sometimes in another request.
		$session->set( self::SESSION_PENDING, [ 'id' => $discordId, 'roles' => $roles ] );

		$realname = $me['global_name'] ?? null;
		$existing = $this->findUserByDiscordId( $discordId );
		if ( $existing ) {
			$id = $existing->getId();
			$username = $existing->getName();
			return true;
		}

		// A new account: named after their unique Discord username
		$username = $this->newUsername( (string)$me['username'] );
		if ( $username === null ) {
			$errorMessage = wfMessage( 'discordlogin-error-noname' )->text();
			return false;
		}
		$id = null;
		return true;
	}

	/** The wiki account linked to a Discord account ID, if any */
	private function findUserByDiscordId( string $discordId ): ?UserIdentity {
		$userId = $this->db->getReplicaDatabase()->newSelectQueryBuilder()
			->select( 'up_user' )
			->from( 'user_properties' )
			->where( [ 'up_property' => self::OPTION, 'up_value' => $discordId ] )
			->caller( __METHOD__ )
			->fetchField();
		if ( !$userId ) {
			return null;
		}
		return $this->userLookup->getUserIdentityByUserId( (int)$userId );
	}

	/**
	 * A free wiki username from a Discord username: "tony_r" -> "Tony r".
	 * If it's taken by another account, add a number: "Tony r 2".
	 */
	private function newUsername( string $discordName ): ?string {
		$base = trim( str_replace( '_', ' ', $discordName ) );
		$base = preg_replace( '/\s+/', ' ', $base );
		for ( $n = 1; $n < 100; $n++ ) {
			$try = $this->userNameUtils->getCanonical( $n === 1 ? $base : "$base $n", UserNameUtils::RIGOR_CREATABLE );
			if ( $try && !$this->userLookup->getUserIdentityByName( $try ) ) {
				return $try;
			}
		}
		return null;
	}

	/** A call to Discord's API; returns the decoded JSON (or null) */
	private function call( string $method, string $path, ?string $token, ?array $form = null, &$status = null ) {
		$options = [ 'method' => $method, 'timeout' => 15 ];
		if ( $form !== null ) {
			$options['postData'] = http_build_query( $form );
		}
		$req = $this->http->create( $this->apiBase() . $path, $options, __METHOD__ );
		$req->setHeader( 'Accept', 'application/json' );
		$req->setHeader( 'User-Agent', 'DiscordLogin (MediaWiki extension, 1.0)' );
		if ( $form !== null ) {
			$req->setHeader( 'Content-Type', 'application/x-www-form-urlencoded' );
		}
		if ( $token !== null ) {
			$req->setHeader( 'Authorization', 'Bearer ' . $token );
		}
		$req->execute();
		$status = $req->getStatus();
		$body = json_decode( (string)$req->getContent(), true );
		if ( $status >= 400 ) {
			$this->getLogger()->warning( "DiscordLogin: $method $path returned $status" );
		}
		return $body;
	}

	/** Their Discord roles, for PluggableAuth's group mapping */
	public function getAttributes( UserIdentity $user ): array {
		$pending = RequestContext::getMain()->getRequest()->getSession()->get( self::SESSION_PENDING );
		return [ 'discord_roles' => $pending['roles'] ?? [] ];
	}

	/** A new account has been created: link it to their Discord account ID */
	public function saveExtraAttributes( int $id ): void {
		$pending = RequestContext::getMain()->getRequest()->getSession()->get( self::SESSION_PENDING );
		if ( empty( $pending['id'] ) ) {
			return;
		}
		$user = MediaWikiServices::getInstance()->getUserFactory()->newFromId( $id );
		$this->userOptions->setOption( $user, self::OPTION, $pending['id'] );
		$this->userOptions->saveOptions( $user );
	}

	public function deauthenticate( UserIdentity &$user ): void {
		RequestContext::getMain()->getRequest()->getSession()->remove( self::SESSION_PENDING );
	}
}

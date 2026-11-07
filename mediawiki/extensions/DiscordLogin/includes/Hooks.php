<?php

namespace MediaWiki\Extension\DiscordLogin;

use MediaWiki\SpecialPage\Hook\AuthChangeFormFieldsHook;
use MediaWiki\Context\RequestContext;
use MediaWiki\Output\Hook\BeforePageDisplayHook;
use MediaWiki\Preferences\Hook\GetPreferencesHook;

class Hooks implements GetPreferencesHook, AuthChangeFormFieldsHook, BeforePageDisplayHook {

	/**
	 * The Discord account ID is stored as a user option. Declaring it (as an
	 * "api" preference, which isn't shown anywhere) makes MediaWiki keep it.
	 */
	public function onGetPreferences( $user, &$preferences ) {
		$preferences[DiscordLogin::OPTION] = [ 'type' => 'api' ];
	}

	/** Is the password form wanted on this request? (Special:UserLogin?local=1) */
	private static function showLocalLogin(): bool {
		$param = RequestContext::getMain()->getConfig()->get( 'DiscordLoginLocalParam' );
		if ( $param === '' || $param === null ) {
			return true;
		}
		return RequestContext::getMain()->getRequest()->getVal( 'local' ) === (string)$param;
	}

	/**
	 * On the login form, hide the username and password fields (and everything
	 * else but the Discord button) unless ?local=1 is in the address.
	 */
	public function onAuthChangeFormFields( $requests, $fieldInfo, &$formDescriptor, $action ) {
		if ( $action !== 'login' ) {
			return;
		}
		$hide = !self::showLocalLogin();
		foreach ( $formDescriptor as $name => &$field ) {
			if ( str_starts_with( $name, 'pluggableauthlogin' ) ) {
				$field['cssclass'] = trim( ( $field['cssclass'] ?? '' ) . ' discordlogin-button' );
				continue;
			}
			if ( !$hide || ( $field['type'] ?? '' ) === 'hidden' ) {
				continue;
			}
			$field['cssclass'] = trim( ( $field['cssclass'] ?? '' ) . ' discordlogin-hidden' );
			// Hidden fields mustn't stop the form being sent
			unset( $field['required'] );
		}
	}

	/** Styles for the login page */
	public function onBeforePageDisplay( $out, $skin ): void {
		$title = $out->getTitle();
		if ( $title && $title->isSpecial( 'Userlogin' ) ) {
			$out->addModuleStyles( 'ext.discordLogin.styles' );
			if ( !self::showLocalLogin() ) {
				// The "Forgot your password?" and "Create account" bits around the form
				$out->addInlineStyle(
					'.mw-userlogin-help, .mw-form-related-link-container, #mw-createaccount-cta, ' .
					'.mw-ui-vform-field.mw-userlogin-rememberme { display: none !important; }'
				);
			}
		}
	}
}

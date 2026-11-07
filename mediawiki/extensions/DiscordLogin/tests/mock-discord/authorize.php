<?php
// Stand-in for https://discord.com/oauth2/authorize: pick who you are.
$people = require __DIR__ . '/people.php';
$back = $_GET['redirect_uri'] ?? '';
$state = $_GET['state'] ?? '';
header( 'Content-Type: text/html; charset=utf-8' );
echo '<!doctype html><title>Stand-in Discord</title><body style="font-family:sans-serif;background:#313338;color:#fff;padding:40px">';
echo '<h1>Stand-in Discord</h1><p>Scope: ' . htmlspecialchars( $_GET['scope'] ?? '' ) . '</p><p>Log in as:</p><ul>';
foreach ( $people as $code => $p ) {
	$url = $back . ( str_contains( $back, '?' ) ? '&' : '?' ) . http_build_query( [ 'code' => $code, 'state' => $state ] );
	echo '<li><a style="color:#8ea1e1" id="as-' . $code . '" href="' . htmlspecialchars( $url ) . '">' . htmlspecialchars( $p['user']['username'] ) . '</a></li>';
}
$cancel = $back . ( str_contains( $back, '?' ) ? '&' : '?' ) . http_build_query( [ 'error' => 'access_denied', 'state' => $state ] );
echo '</ul><p><a style="color:#8ea1e1" id="cancel" href="' . htmlspecialchars( $cancel ) . '">Cancel</a></p></body>';

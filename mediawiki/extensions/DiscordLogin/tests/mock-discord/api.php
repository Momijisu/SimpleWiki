<?php
// Stand-in for https://discord.com/api/v10 (apiBase = .../api.php)
$people = require __DIR__ . '/people.php';
$path = $_SERVER['PATH_INFO'] ?? '';
header( 'Content-Type: application/json' );
function who( $people ) {
	// Apache doesn't always pass Authorization into $_SERVER
	$headers = function_exists( 'getallheaders' ) ? array_change_key_case( getallheaders(), CASE_LOWER ) : [];
	$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? ( $headers['authorization'] ?? '' );
	$code = preg_replace( '/^Bearer tok-/', '', $auth );
	return $people[$code] ?? null;
}
if ( $path === '/oauth2/token' && $_SERVER['REQUEST_METHOD'] === 'POST' ) {
	$code = $_POST['code'] ?? '';
	if ( !isset( $people[$code] ) || ( $_POST['client_secret'] ?? '' ) !== 'test-secret' ) {
		http_response_code( 400 );
		echo json_encode( [ 'error' => 'invalid_grant' ] );
		exit;
	}
	echo json_encode( [ 'access_token' => 'tok-' . $code, 'token_type' => 'Bearer', 'scope' => 'identify guilds.members.read' ] );
	exit;
}
$p = who( $people );
if ( !$p ) {
	http_response_code( 401 );
	echo json_encode( [ 'message' => '401: Unauthorized', 'code' => 0 ] );
	exit;
}
if ( $path === '/users/@me' ) {
	echo json_encode( $p['user'] );
	exit;
}
if ( preg_match( '#^/users/@me/guilds/555/member$#', $path ) ) {
	if ( !$p['member'] ) {
		http_response_code( 404 );
		echo json_encode( [ 'message' => 'Unknown Guild', 'code' => 10004 ] );
		exit;
	}
	echo json_encode( $p['member'] + [ 'nick' => null, 'joined_at' => '2026-01-01T00:00:00+00:00' ] );
	exit;
}
http_response_code( 404 );
echo json_encode( [ 'message' => '404: Not Found', 'code' => 0 ] );

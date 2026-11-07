<?php
// Test people for the stand-in Discord. Role 900 = "Wiki Mod".
return [
	'alice' => [ 'user' => [ 'id' => '111111111111111111', 'username' => 'alice.rp', 'global_name' => 'Alice' ],
		'member' => [ 'roles' => [ '900', '901' ], 'pending' => false ] ],
	'tony' => [ 'user' => [ 'id' => '222222222222222222', 'username' => 'tony_r', 'global_name' => 'Tony' ],
		'member' => [ 'roles' => [ '901' ], 'pending' => false ] ],
	'carol' => [ 'user' => [ 'id' => '333333333333333333', 'username' => 'carol', 'global_name' => 'Carol' ],
		'member' => null ],
	'dave' => [ 'user' => [ 'id' => '444444444444444444', 'username' => 'dave', 'global_name' => 'Dave' ],
		'member' => [ 'roles' => [], 'pending' => true ] ],
];

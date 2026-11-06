
# ---------- Added by the local test setup: the same as the Let's RP wiki ----------
$wgDefaultSkin = 'citizen';

wfLoadExtension( 'ParserFunctions' );
wfLoadExtension( 'Scribunto' );
$wgScribuntoDefaultEngine = 'luastandalone';
wfLoadExtension( 'TemplateData' );
wfLoadExtension( 'TemplateStyles' );
wfLoadExtension( 'Cite' );
wfLoadExtension( 'InputBox' );
wfLoadExtension( 'TabberNeue' );
wfLoadExtension( 'ShortDescription' );
wfLoadExtension( 'PageImages' );
wfLoadExtension( 'TextExtracts' );
$wgExtractsExtendRestSearch = true;
wfLoadExtension( 'CategoryTree' );

# Editing, as on the real wiki: VisualEditor's "Insert template" form fills in
# the infobox fields from each template's TemplateData.
wfLoadExtension( 'VisualEditor' );
$wgDefaultUserOptions['visualeditor-enable'] = 1;
wfLoadExtension( 'WikiEditor' );
wfLoadExtension( 'CodeEditor' );
wfLoadExtension( 'SyntaxHighlight_GeSHi' );

# Community, as on the real wiki
wfLoadExtension( 'Linter' );
wfLoadExtension( 'Echo' );
wfLoadExtension( 'Thanks' );
wfLoadExtension( 'DiscussionTools' );
wfLoadExtension( 'MultimediaViewer' );
wfLoadExtension( 'Gadgets' );

$wgEnableUploads = true;
$wgFileExtensions[] = 'svg';
$wgShowExceptionDetails = true;

# The Let's RP logo in the corner and the menu (start.sh copies it into place)
$wgLogos = [ '1x' => "$wgScriptPath/lrp-logo.png", 'icon' => "$wgScriptPath/lrp-logo.png" ];
# Show the real name in pages and screenshots (the install name marks it as a test copy)
$wgSitename = "Let's RP Wiki";


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

$wgEnableUploads = true;
$wgFileExtensions[] = 'svg';
$wgShowExceptionDetails = true;

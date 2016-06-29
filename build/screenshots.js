/* jshint node: true */
/* global seleniumUtils, langs */
var i, l,
	chrome = require( 'selenium-webdriver/chrome' ),
	test = require( 'selenium-webdriver/testing' ),
	fs = require( 'fs' ),
	Jimp = require( 'jimp' );

function runTests( lang ) {
	test.describe( 'Screenshots: ' + lang, function () {
		var driver;

		test.beforeEach( function () {
			driver = new chrome.Driver();

			driver.manage().timeouts().setScriptTimeout( 20000 );
			driver.manage().window().setSize( 1200, 800 );

			driver.get( 'http://en.wikipedia.beta.wmflabs.org/wiki/PageDoesNotExist?veaction=edit&uselang=' + lang );
			driver.wait(
				driver.executeAsyncScript(
					// This function is converted to a string and executed in the browser
					function () {
						var done = arguments[ arguments.length - 1 ];

						window.seleniumUtils = {
							getBoundingRect: function ( elements ) {
								var i, l, rect, boundingRect;
								for ( i = 0, l = elements.length; i < l; i++ ) {
									rect = elements[ i ].getBoundingClientRect();
									if ( !boundingRect ) {
										boundingRect = {
											left: rect.left,
											top: rect.top,
											right: rect.right,
											bottom: rect.bottom
										};
									} else {
										boundingRect.left = Math.min( boundingRect.left, rect.left );
										boundingRect.top = Math.min( boundingRect.top, rect.top );
										boundingRect.right = Math.max( boundingRect.right, rect.right );
										boundingRect.bottom = Math.max( boundingRect.bottom, rect.bottom );
									}
								}
								if ( boundingRect ) {
									boundingRect.width = boundingRect.right - boundingRect.left;
									boundingRect.height = boundingRect.bottom - boundingRect.top;
								}
								return boundingRect;
							},
							collapseToolbar: function () {
								ve.init.target.toolbar.items.forEach( function ( group ) {
									if ( group.setActive ) {
										group.setActive( false );
									}
								} );
								ve.init.target.actionsToolbar.items.forEach( function ( group ) {
									if ( group.setActive ) {
										group.setActive( false );
									}
								} );
							}
						};

						// Suppress welcome dialog
						localStorage.setItem( 've-beta-welcome-dialog', 1 );
						// Suppress user education indicators
						localStorage.setItem( 've-hideusered', 1 );
						mw.hook( 've.activationComplete' ).add( function () {
							var target = ve.init.target,
								surfaceView = target.getSurface().getView();
							// Hide edit notices
							target.actionsToolbar.tools.notices.getPopup().toggle( false );
							// Modify the document to make the save button blue
							// Wait for focus
							surfaceView.once( 'focus', function () {
								target.surface.getModel().getFragment().insertContent( ' ' ).collapseToStart().select();
								// Wait for save button fade
								setTimeout( done, 100 );
							} );
						} );
					}
				)
			);
		} );

		test.afterEach( function () {
			driver.quit();
		} );

		function runScreenshotTest( name, clientScript, padding ) {
			var filename = './screenshots/' + name + '-' + lang + '.png';
			driver.wait(
				driver.executeAsyncScript( clientScript ).then( function ( rect ) {
					return driver.takeScreenshot().then( function ( base64Image ) {
						var imageBuffer;
						if ( rect ) {
							imageBuffer = new Buffer( base64Image, 'base64' );
							return cropScreenshot( filename, imageBuffer, rect, padding );
						} else {
							fs.writeFile( filename, base64Image, 'base64' );
						}
					} );
				} ),
				20000
			);
		}

		function cropScreenshot( filename, imageBuffer, rect, padding ) {
			if ( padding === undefined ) {
				padding = 5;
			}

			return Jimp.read( imageBuffer ).then( function ( jimpImage ) {
				jimpImage
					.crop(
						rect.left - padding,
						rect.top - padding,
						rect.width + ( padding * 2 ),
						rect.height + ( padding * 2 )
					)
					.write( filename );
			} );
		}

		test.it( 'Toolbar & action tools', function () {
			runScreenshotTest( 'VisualEditor_toolbar',
				// This function is converted to a string and executed in the browser
				function () {
					var done = arguments[ arguments.length - 1 ];
					done(
						seleniumUtils.getBoundingRect( [
							ve.init.target.toolbar.$element[ 0 ],
							$( '#ca-nstab-main' )[ 0 ]
						] )
					);
				},
				0
			);
			runScreenshotTest( 'VisualEditor_toolbar_actions',
				// This function is converted to a string and executed in the browser
				function () {
					var done = arguments[ arguments.length - 1 ];
					done(
						seleniumUtils.getBoundingRect( [
							ve.init.target.toolbar.$actions[ 0 ]
						] )
					);
				},
				0
			);
		} );
		test.it( 'Citoid inspector', function () {
			runScreenshotTest( 'VisualEditor_Citoid_Inspector',
				// This function is converted to a string and executed in the browser
				function () {
					var done = arguments[ arguments.length - 1 ];
					ve.init.target.toolbar.tools.citefromid.onSelect();
					setTimeout( function () {
						var rect = ve.init.target.surface.context.inspectors.currentWindow.$element[ 0 ].getBoundingClientRect();
						done( {
							top: rect.top - 20,
							left: rect.left,
							width: rect.width,
							height: rect.height + 20
						} );
					}, 500 );
				}
			);
		} );
		test.it( 'Tool groups (headings/text style/indentation/page settings)', function () {
			runScreenshotTest( 'VisualEditor_Toolbar_Headings',
				// This function is converted to a string and executed in the browser
				function () {
					var done = arguments[ arguments.length - 1 ],
						toolGroup = ve.init.target.toolbar.tools.paragraph.toolGroup;

					seleniumUtils.collapseToolbar();
					toolGroup.setActive( true );

					setTimeout( function () {
						done(
							seleniumUtils.getBoundingRect( [
								toolGroup.$element[ 0 ],
								toolGroup.$group[ 0 ]
							] )
						);
					} );
				}
			);
			runScreenshotTest( 'VisualEditor_Toolbar_Formatting',
				// This function is converted to a string and executed in the browser
				function () {
					var done = arguments[ arguments.length - 1 ],
						toolGroup = ve.init.target.toolbar.tools.bold.toolGroup;

					seleniumUtils.collapseToolbar();
					toolGroup.setActive( true );
					toolGroup.getExpandCollapseTool().onSelect();

					setTimeout( function () {
						done(
							seleniumUtils.getBoundingRect( [
								toolGroup.$element[ 0 ],
								toolGroup.$group[ 0 ]
							] )
						);
					} );
				}
			);
			runScreenshotTest( 'VisualEditor_Toolbar_List_and_indentation',
				// This function is converted to a string and executed in the browser
				function () {
					var done = arguments[ arguments.length - 1 ],
						toolGroup = ve.init.target.toolbar.tools.bullet.toolGroup;

					seleniumUtils.collapseToolbar();
					toolGroup.setActive( true );

					setTimeout( function () {
						done(
							seleniumUtils.getBoundingRect( [
								toolGroup.$element[ 0 ],
								toolGroup.$group[ 0 ]
							] )
						);
					} );
				}
			);
			runScreenshotTest( 'VisualEditor_More_Settings',
				// This function is converted to a string and executed in the browser
				function () {
					var done = arguments[ arguments.length - 1 ],
						toolGroup = ve.init.target.actionsToolbar.tools.advancedSettings.toolGroup;

					seleniumUtils.collapseToolbar();
					toolGroup.setActive( true );

					setTimeout( function () {
						done(
							seleniumUtils.getBoundingRect( [
								toolGroup.$element[ 0 ],
								toolGroup.$group[ 0 ],
								// Include save button for context
								ve.init.target.toolbarSaveButton.$element[ 0 ]
							] )
						);
					} );
				}
			);
		} );
		test.it( 'Save dialog', function () {
			runScreenshotTest( 'VisualEditor_save_dialog',
				// This function is converted to a string and executed in the browser
				function () {
					var done = arguments[ arguments.length - 1 ];
					ve.init.target.toolbarSaveButton.emit( 'click' );
					setTimeout( function () {
						done(
							seleniumUtils.getBoundingRect( [
								ve.init.target.surface.dialogs.currentWindow.$frame[ 0 ]
							] )
						);
					}, 500 );
				}
			);
		} );
		test.it( 'Special character inserter', function () {
			runScreenshotTest( 'VisualEditor_Toolbar_SpecialCharacters',
				// This function is converted to a string and executed in the browser
				function () {
					var done = arguments[ arguments.length - 1 ];
					ve.init.target.toolbar.tools.specialCharacter.onSelect();
					setTimeout( function () {
						done(
							seleniumUtils.getBoundingRect( [
								ve.init.target.toolbar.tools.specialCharacter.$element[ 0 ],
								ve.init.target.surface.toolbarDialogs.$element[ 0 ]
							]
						) );
					}, 1000 );
				}
			);
		} );
		test.it( 'Math dialog', function () {
			runScreenshotTest( 'VisualEditor_formula',
				// This function is converted to a string and executed in the browser
				function () {
					var win,
						done = arguments[ arguments.length - 1 ],
						surface = ve.init.target.surface;

					surface.dialogs.once( 'opening', function ( win, opening ) {
						opening.then( function () {
							win.previewElement.once( 'render', function () {
								win.previewElement.$element.find( 'img' ).on( 'load', function () {
									done(
										seleniumUtils.getBoundingRect( [
											win.$frame[ 0 ]
										]
									) );
								} );
							} );
							win.input.setValue( 'E = mc^2' ).moveCursorToEnd();
						} );
					}, 1000 );
					surface.executeCommand( 'mathDialog' );
					win = surface.dialogs.currentWindow;
				}
			);
		} );
	} );
}

for ( i = 0, l = langs.length; i < l; i++ ) {
	runTests( langs[ i ] );
}
<!DOCTYPE html>
<html>
	<head>
		<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
		<title>jQuery Multiselect 2.0 Example Page</title>
		<link type="text/css" href="css/common.css" rel="stylesheet" />
		<link type="text/css" href="css/ui-lightness/jquery-ui-1.8.20.custom.css" rel="stylesheet" />
		<link type="text/css" href="css/jquery-multiselect-2.0.css" rel="stylesheet" />
		<script type="text/javascript" src="js/jquery-1.7.2.min.js"></script>
		<script type="text/javascript" src="js/jquery-ui-1.8.20.custom.min.js"></script>
		<script type="text/javascript" src="js/jquery-multiselect-2.0.js"></script>
		<script type="text/javascript" src="js/locales/jquery-multiselect-2_fr.js"></script>
		<script type="text/javascript" src="http://jqueryui.com/themeroller/themeswitchertool/"></script>
		<script type="text/javascript">
			$(function() {
				$('#multiselect').multiselect({
					sortMethod: 'standard',
					moveEffect: 'blind',
					moveEffectOptions: {direction:'vertical'},
					moveEffectSpeed: 'fast'
				}).bind('change', function(evt, ui) {
					var value = ui.itemIndex > -1 ? ui.optionCache.get(ui.itemIndex).optionElement.attr('value') : null;
					$('#debug').append( $('<div></div>').text('Multiselect change event! ' + (value ? 'value='+value+' was' : 'all items were') + ' ' + (ui.selected ? 'selected' : 'deselected')) );
				}).bind('multiselectsearch', function(evt, ui) {
					$('#debug').append( $('<div></div>').text('Multiselect search event! searching for "' + ui.text + '"') );
				});

				if ($.fn.themeswitcher) {
					$('#switcher')
						.css('padding-bottom', '32px')
						.before('<h4>Use the themeroller to dynamically change look and feel</h4>')
						.themeswitcher();
				}


				$('#btnRefresh').click(function() {
					$('#multiselect').multiselect('refresh');
				});
				$('#btnToggleOriginal').click(function() {
					$('#multiselect').toggle();
				});

				$('#selectLocale').change(function() {
					$('#multiselect').multiselect('locale', $(this).val() );
				});

				// build locale options
				for (var locale in $.uix.multiselect.i18n) {
					$('#selectLocale').append($('<option></option>').attr('value', locale).text(locale.length == 0 ? '(default)' : locale));
				}
				$('#selectLocale').val($('#multiselect').multiselect('locale'));

			});
		</script>
		<style type="text/css">
			.draggable { background: yellow; padding: 16px; }
			#multiselect {
				width: 400px;
				height: 200px;
			}
			#uiControls {
				margin-top: 16px;
			}
			#debug {
				height: 100px;
				overflow: auto;
				border: 1px solid black;
				padding: 8px;
				margin-top: 16px;
			}
		</style>
	</head>
	<body>

	<div id="content">

		<h1>Welcome to the jQuery Multiselect 2.0 Widget !</h1>

		<div id="switcher"></div>

		<div>
		<select id="multiselect" multiple="multiple"><?php
			//$buffer = file_get_contents('languages.txt');
			$buffer = file_get_contents('countries.txt');
			$data = array();
			foreach (explode("\n", $buffer) as $line) {
				list($code,$lang) = split("=", $line, 2);
				$selected = (rand(0, 20) == 1);
				if (!empty($code)) {
					?><option value="<?php echo $code ?>"<?php echo ($selected ? ' selected="selected"' : '') ?>><?php echo $lang ?></option><?php
				}
			}
		?></select>
		</div>

		<div class="ui-helper-clearfix"></div>

		<div id="uiControls">
			<button id="btnRefresh">Refresh</button>
			<button id="btnToggleOriginal">Toggle original element</button>
			<label for="selectLocale">Change locale : </label><select id="selectLocale" name="selectLocale"></select>
		</div>

		<div id="debug">

		</div>

	</div>

	</body>
</html>



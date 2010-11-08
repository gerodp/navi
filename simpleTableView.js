

function SimpleTableView(container)
{
	this.containerElement = container;
}

SimpleTableView.prototype.draw = function(data, options)
{
	var html = [];
	html.push('<table align="center">');

	// Header row
	html.push('<tr>');
	for (var col = 0; col < data.getNumberOfColumns(); col++) 
	{
		html.push('<th>' + this.escapeHtml( data.getColumnLabel(col) ) + '</th>');
	}
	html.push('</tr>');

	//Rows
	for (var row = 0; row < data.getNumberOfRows(); row++) 
	{
		html.push('<tr>');
		for (var col = 0; col < data.getNumberOfColumns(); col++) 
		{
			html.push('<td>');
		
			html.push( this.escapeHtml(data.getFormattedValue(row, col)) );
			
			html.push('</td>');
		}
		html.push('</tr>');
	}
	html.push('</table>');

	this.containerElement.innerHTML = html.join('');
}

SimpleTableView.prototype.escapeHtml = function(text) 
{
	if (text == null)
		return '';
		
	return text.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
}
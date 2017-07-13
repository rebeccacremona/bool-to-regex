//
// Convert a boolean search query into a regex
//

var operators = ["AND", "OR", "NOT", "OR NOT"];


// Takes the ID of an input html element
// Optionally takes the ID of an output html element
// Value attribute of the input element, on function call, should be a string:
//       ... all match terms wrapped in double quotes
//       ... all operators in ALL CAPS
//       ... groups marked by (), no nested groups
//       ... if parentheses are used once, they must be used everywhere, e.g. ("spam") AND ("eggs" OR "toast")
// If an output element is specified, function sets the value attribute of the element to the regex
// Returns the regex as a string
function boolToRegex(input, output) {

	var q = getQuery(input);

	// Parse the passed in query into groups seperated by operators
	var q_grouped = groupQuery(q);

	// Convert the groups into regular expressions; split the connecting operators out into their own array
	var q_interpreted = interpretQuery(q_grouped);
	var groups_terms = q_interpreted["terms"];
	var groups_operators = q_interpreted["operators"];

	// Assemble the query
	var results = "";

	for (var i=0; i < groups_terms.length; i++) {
		results = combineGroups(results, groups_terms[i], groups_operators[i]);
	}

	// Output the results
	if (output) {
		document.getElementById(output).value = results.trim();
	}
	return results;

}


// Takes the id of an html element
// Retrieves the "value" attribute of that html
// Returns it (a string)
function getQuery(id) {

	var q = document.getElementById(id).value.trim();
	if (q == "") {
		return " ";
	} else {
		return q;
	}

}

// Takes a string: a boolean search query, formatted according to convention
// Parses the string into groups separated by operators
// Returns an array
function groupQuery(q) {

	var q_grouped = q.replace(/ *\((.*?)\) */g, ',$1,');

	if (q_grouped[0] == ","){
		q_grouped= q_grouped.slice(1);
	}

	if (q_grouped[-1] == ","){
		q_grouped= q_grouped.slice(0, -1);
	}

	q_grouped= q_grouped.split(",");

	return q_grouped;

}


// Takes an array of grouped search terms and operators (all strings)
// Converts the groups into regular expressions; split the connecting operators out into their own array
// Returns an object {"terms":[],"operators":[]}
function interpretQuery(q_grouped) {

	var groups_terms = [];
	var groups_operators = [];

	// Prepare to add the first group correctly:
	//  unless "NOT" precedes the first  term, make "AND" the first operator
	if (q_grouped[0] == "NOT") {
		var groups_operators = [];
	} else {
		var groups_operators = ["AND"];
	}

	for (var i=0; i < q_grouped.length; i++) {
		// if the term is an operator
		if (operators.indexOf(q_grouped[i]) > -1) {
			groups_operators.push(q_grouped[i]);
		} else{
		// if the term isn't an operator
			groups_terms.push("(" + simple_boolToRegex(regexEscape(q_grouped[i])) + ")");
		}
	}

	return {"terms": groups_terms, "operators": groups_operators};

}


// Takes three strings: an already-translated-to-regex group, an operator, and...
//     ...an empty string
//     ...or, another already-translated-to regex group
// Appends the group to the string in the appropriate way, as determined by the operator
// Returns a string.
function combineGroups(results, group, operator){

	// append a term following "AND"
	if (operator == "AND") {
		results += group;
	}

	// append a term following "NOT"
	if (operator == "NOT") {
		console.log(group);
		results = "(?!" + group + ")" + results.trim();
	}

	// append a term following "OR"
	if (operator == "OR") {
		results += "|" + group;
	}

	// append a term following "OR NOT"
	if (operator == "OR NOT") {
		results = "^(?!" + group + ")|" + results.trim();
	}

	// console.log(results);
	return results;

}


// Takes a string: a simple boolean search query, formatted according to convention
//       ... all terms wrapped in double quotes
//       ... all operators in ALL CAPS
//       ... no groups (i.e. no parentheses)
// Converts that query to regex
// Returns a string
function simple_boolToRegex(query) {

	var q = query

	// Create an array that contains the terms, and an array of operators

		// Parse simple query
		var q_parsed = simple_parseQuery(q);

		// Split the query into two arrays: terms (formatted) and operators
		var q_split = simple_splitQuery(q_parsed);
		var q_terms = q_split.terms;
		var q_operators = q_split.operators;


	// Assemble the query

		// Initialize the regex
		var regex = "^";

		// Add the terms to it, in the manner required by each term's operator
		for (var i=0; i<q_terms.length; i++) {
			regex = simple_appendToRegex(regex, q_terms[i], q_operators[i]);
		}

		// Since all terms are added as lookaheads, something to catch all characters of matching rows
		regex += ".*";

	return regex;

}


// Takes a string: a simple boolean search query, formatted according to convention
// Parse the string into terms and operators
// Returns an array
function simple_parseQuery (q){
	var q_parsed = q
			.replace(/"(.*?)"/g, '$1,')
			.replace(/ *AND */g, 'AND,')
			.replace(/ *OR NOT */g, 'OR NOT,')
			.replace(/ *NOT(?!,) */g, 'NOT,')
			.replace(/ *OR(?! NOT,) */g, 'OR,')
			.slice(0, -1)
			.split(",");

	return q_parsed;

}


// Takes an array: a parsed simple boolean search query
// Splits into an array of formatted search terms and an array of operators
// Returns an object {"terms":[],"operators":[]}
function simple_splitQuery(q_parsed){

	var q_terms = [];

	// Determine the operator for the first term:
	//     ....unless "NOT" precedes the first  term, make "AND" the first operator
	if (q_parsed[0] == "NOT") {
		var q_operators = [];
	} else {
		var q_operators = ["AND"];
	}


	// Split the query into two arrays: terms and operators
	// Prepend wildcards to all terms
	for (var i=0; i < q_parsed.length; i++) {
		// if the term is an operator
		if (operators.indexOf(q_parsed[i]) > -1) {
			q_operators.push(q_parsed[i]);
		} else{
		// if the term isn't an operator
			q_terms.push(".*" + q_parsed[i]);
		}
	}

	return {"terms": q_terms, "operators": q_operators};

}

// Takes three strings: a regex, a formatted search term, and an operator
// Appends the term to the regex, in the manner appropriate to the operator
// Returns a string
function simple_appendToRegex(regex, term, operator){

	// append a term following "AND"
	if (operator == "AND") {
		regex += "(?=" + term + ")";
	}

	// append a term following "NOT"
	if (operator == "NOT") {
		regex += "(?!" + term + ")";
	}

	// append a term following "OR"
	if (operator == "OR") {
		regex += ".*|^(?=" + term + ")";
	}

	// append a term following "OR NOT"
	if (operator == "OR NOT") {
		regex += "|^(?!" + term + ")";
	}

	return regex;

}

// Takes a string
// Returns a sring with all regex special characters escaped
function regexEscape(str) {

    // courtesy of:
    // http://stackoverflow.com/questions/2593637/how-to-escape-regular-expression-in-javascript
    return (str+'').replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");

}

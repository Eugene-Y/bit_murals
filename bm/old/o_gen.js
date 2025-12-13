// noprotect
// bit murals by Eugene Yakshin, 2020
// License: CC Attribution-NonCommercial

// TODO multithread pattern update
// https://medium.com/techtrument/multithreading-javascript-46156179cf9a


function generateFormula(){
	// depth > 8 deteriorates the patterns
	let p = generateRecursive(genProbs["d"] * 8);
	if (prob(genProbs["~"]))
			p = "!(" + p + ")";
	return p;
}


function generateRecursive(depth) {
	let r;
	if (depth < 1) {
		r = operand();
		return r;
	}
	
	--depth;
	let a = generateRecursive(depth);
	r = a;
	if (prob(genProbs["r"])) {
		let o = operation();
		let b = generateRecursive(depth);
			r += o + b;
	}
	
	if (prob(genProbs["⟁"]))
		r = transcendentalFunction(r);
	
	else if (prob(genProbs["()"]))
		r = brackets(r);
	
	if (prob(genProbs["〇"]))
		r = userFunction(r);
			
	return r;	
}

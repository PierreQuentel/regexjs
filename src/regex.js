import { insertExplicitConcatOperator, toPostfix } from './parser.js';
import { toNFA, toNFAFromInfixExp, recognize } from './nfa.js';

function createMatcher(exp) {
    // Generates an NFA using a stack
    // const expWithConcatenationOperator = insertExplicitConcatOperator(exp);
    // const postfixExp = toPostfix(expWithConcatenationOperator);
    // const nfa = toNFA(postfixExp);

    // Generates an NFA by constructing a parse tree
    // No explicit concatenation operator required
    const nfa = toNFAFromInfixExp(exp);

    return word => recognize(nfa, word);
}

export { createMatcher };

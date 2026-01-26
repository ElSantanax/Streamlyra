# Project Code Rules and Development Guidelines

## Context and Analysis Protocol

**BEFORE starting any task, ALWAYS:**

1. **Analyze the project structure**
   - Review the directory organization and file structure
   - Identify the main entry points and core modules
   - Understand how different parts of the codebase relate to each other

2. **Understand what the project does**
   - Read the README and any available documentation
   - Identify the project's purpose and main functionality
   - Understand the target users and use cases

3. **Review the existing codebase**
   - Examine the coding patterns and conventions already in use
   - Identify the frameworks, libraries, and technologies being used
   - Look for existing similar implementations before writing new code

4. **Understand the context of the task**
   - Clarify the specific requirement or problem to solve
   - Identify dependencies and potential side effects
   - Determine how the change fits into the larger system

5. **Ask questions when unclear**
   - If requirements are ambiguous, ask for clarification BEFORE coding
   - If multiple approaches exist, present options with trade-offs
   - If you notice potential issues or conflicts, raise them early

---

## Solution Selection Protocol

**AFTER understanding the context, ALWAYS:**

1. **Search for the simplest solution first**
   - Look for existing solutions in the codebase that can be reused or adapted
   - Check if standard library functions can solve the problem
   - Consider if the framework/library already provides this functionality
   - Avoid creating custom solutions when battle-tested alternatives exist

2. **Evaluate multiple approaches**
   - Identify at least 2-3 possible solutions
   - Compare them based on: simplicity, maintainability, and performance
   - **ALWAYS choose the simplest approach that solves the problem**
   - Reject solutions that add unnecessary complexity

3. **Question every addition**
   - Ask: "Is this feature/abstraction/pattern really necessary?"
   - Ask: "Will this still make sense in 6 months?"
   - Ask: "Am I solving a problem that doesn't exist yet?"
   - **If the answer is unclear, default to the simpler option**

4. **Avoid over-engineering**
   - Don't add flexibility for hypothetical future needs
   - Don't create abstractions until you have 3+ similar cases
   - Don't add features that weren't explicitly requested
   - Don't optimize prematurely without measurements
   - Don't use design patterns just because they're "best practices"

5. **Prefer boring technology**
   - Use proven, well-understood solutions over new/trendy ones
   - Choose tools and patterns the team already knows
   - Avoid introducing new dependencies unless absolutely necessary
   - **The best code is code that doesn't surprise anyone**

6. **Present your reasoning**
   - Explain which approach you chose and why
   - Show what alternatives you considered
   - Justify why the chosen solution is the simplest
   - Be transparent about any trade-offs

**ONLY AFTER completing this analysis and solution selection, proceed with implementation following these rules:**

---

## KISS Principle (Keep It Simple, Stupid)
1. Always seek the simplest and most direct solution possible
2. Prefer readable code over "clever" or overly compact code
3. Avoid over-engineering - don't add unrequested features
4. Implement only what's necessary to solve the current problem
5. Confirm you understand the problem correctly before coding
6. Propose the simplest solution that meets the requirement
7. If there are multiple approaches, explain options and trade-offs
8. Ask if something isn't clear before starting

## Single Responsibility Principle (SRP)
9. Use descriptive and clear variable names
10. Keep functions small with single responsibilities
11. Each module/class should have only one reason to change
12. Follow the conventions of the language/framework being used
13. Maintain consistency with existing project code
14. Use consistent indentation and formatting

## Separation of Concerns (SoC)
15. Clearly separate: business logic, presentation, and data access in distinct layers
16. Keep dependencies updated and use specific versions
17. Document important design decisions
18. Keep the README updated with clear instructions
19. Document APIs and public functions
20. Explain the "why", not just the "what"

## DRY Principle (Don't Repeat Yourself)
21. Refactor when you find duplicated or confusing code
22. Write incremental and testable code
23. Use appropriate data structures for each case
24. Comment only when code isn't self-explanatory
25. Create descriptive commit messages following conventions (type: description)

## Error Handling
26. Implement error handling in all critical operations
27. Provide clear and helpful error messages
28. Validate inputs before processing them
29. Use try-catch/error boundaries as appropriate
30. Never silently hide errors

## Input Validation
31. Validate and sanitize all user inputs
32. Don't trust client data without validation

## Performance
33. Optimize only when necessary and measurable
34. Don't sacrifice readability for premature optimizations
35. Consider resource impact (memory, CPU)
36. Avoid unnecessary expensive operations inside loops

## Security
37. Never expose credentials or sensitive information in code
38. Use secure practices (prevent SQL injection, XSS, etc.)
39. Implement authentication and authorization when necessary

## Testing
40. Test the code before considering it finished
41. Verify edge cases and boundary situations
42. Test with real data when possible
43. Validate expected behavior before delivering

## Communication and Transparency
44. Explain what you're going to do before doing it
45. Report problems or limitations encountered
46. Suggest improvements when appropriate
47. Be clear about what works and what doesn't

---

## Additional Best Practices

### Dependency Management
48. Evaluate the necessity before adding new dependencies
49. Consider the maintenance status and community support of libraries
50. Prefer well-established libraries over newer alternatives without strong justification
51. Keep dependencies to a minimum - each one adds complexity and potential security risks
52. Document why each major dependency was chosen

### Configuration and Environment
53. Never hardcode configuration values (URLs, API keys, ports, etc.)
54. Use environment variables for configuration that changes between environments
55. Provide sensible defaults when possible
56. Document all required environment variables in README or .env.example
57. Keep configuration separate from code

### Logging and Debugging
58. Add meaningful logs at critical points (not everywhere)
59. Use appropriate log levels (error, warn, info, debug)
60. Include context in log messages (what failed, why, relevant data)
61. Never log sensitive information (passwords, tokens, personal data)
62. Make logs actionable - they should help diagnose problems

### Git and Version Control
63. Make small, focused commits that do one thing
64. Write clear commit messages: what changed and why
65. Follow conventional commit format: type(scope): description
66. Never commit sensitive data, credentials, or environment files
67. Keep commits atomic - each commit should leave the code in a working state
68. Review your own changes before committing

### Code Review Mindset
69. Write code as if someone else will read it tomorrow (they will)
70. Add comments for "why" not "what" - code shows what, comments explain why
71. Consider the next developer's experience
72. Make your intentions clear through code structure and naming
73. If you need to explain your code verbally, it probably needs refactoring

### Refactoring Guidelines
74. Refactor with tests in place, or add tests first
75. Make one change at a time when refactoring
76. Keep refactoring separate from feature additions
77. Don't refactor and add features in the same commit
78. If it works and is readable, consider not refactoring it

### Technical Debt Management
79. Document technical debt when you create it (with TODO/FIXME comments)
80. Explain why shortcuts were taken and what the proper solution would be
81. Estimate the effort to fix technical debt
82. Don't let "temporary" solutions become permanent
83. Address technical debt before it compounds

### Backwards Compatibility
84. Consider the impact of changes on existing functionality
85. Don't break existing APIs without versioning strategy
86. Deprecate features properly before removing them
87. Provide migration paths for breaking changes
88. Test that existing functionality still works after changes

---

## Critical Mantras - Remember Always

- **"The best code is no code"** - Can this be solved without writing code?
- **"Simplicity is the ultimate sophistication"** - Is this the simplest way?
- **"You aren't gonna need it (YAGNI)"** - Is this needed RIGHT NOW?
- **"Make it work, make it right, make it fast"** - In that order, not all at once
- **"Premature optimization is the root of all evil"** - Don't optimize without data
- **"Boring is good"** - Predictable, maintainable code beats clever code
- **"Code is read 10x more than it's written"** - Optimize for readability
- **"Delete code is the best code"** - Remove unused code immediately
- **"Explicit is better than implicit"** - Make intentions clear
- **"Future you will thank present you"** - Write code your future self will understand

---

## Red Flags - Stop and Reconsider If:

- You're adding a dependency for a single function you could write in 10 lines
- You're creating an abstraction "for future flexibility" without concrete use cases
- You're copying and pasting code blocks - extract to a function instead
- You're writing a comment to explain confusing code - refactor the code instead
- You're ignoring a test failure "because it's not related"
- You're committing code you haven't tested
- You're implementing features that weren't requested
- You're optimizing without measuring performance first
- You find yourself saying "I'll clean this up later"

---

## Workflow Summary

For every task:
1. **ANALYZE** → Understand the project and context
2. **SEARCH** → Look for the simplest existing solution
3. **EVALUATE** → Compare approaches, choose simplicity
4. **PLAN** → Determine the minimal implementation needed
5. **COMMUNICATE** → Explain your approach and reasoning
6. **IMPLEMENT** → Follow the rules above
7. **TEST** → Verify it works correctly
8. **REVIEW** → Check your own code before submitting
9. **DOCUMENT** → Update relevant documentation
10. **COMMIT** → Make clean, focused commits with clear messages

---

## When in Doubt

- **Choose simplicity over cleverness**
- **Choose readability over brevity**
- **Choose boring over exciting**
- **Choose explicit over implicit**
- **Choose working over perfect**
- **Ask for clarification**
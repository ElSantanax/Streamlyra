---
title: Code Rules and Standards
inclusion_mode: "always"
---

# Project Code Rules

These are the fundamental principles that must be followed in all code written for this project.

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

## Communication
44. Explain what you're going to do before doing it
45. Report problems or limitations encountered
46. Suggest improvements when appropriate
47. Be clear about what works and what doesn't
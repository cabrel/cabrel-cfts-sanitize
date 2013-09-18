test:
	npm test


coverage:
	LIB_COV=1 /usr/bin/mocha -R html-cov > coverage.html
	rm -rf lib-cov


complexity:
	cr -n -l -o complexity.md -f markdown lib/*.js
	pandoc --from markdown --to html complexity.md > complexity.html
	rm complexity.md


.PHONY: test coverage complexity

dev:
	npm run dev

deploy:
	rm -rf dist
	npm run build
	ansible-playbook -i ../ansible/inventory ../ansible/myaws.yml -e "project_name=fractal-glass-gradients"
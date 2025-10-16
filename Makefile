.PHONY: up down restart build logs clean help

help: ## ヘルプを表示
	@echo "利用可能なコマンド:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

up: ## コンテナを起動
	docker-compose up

up-d: ## コンテナをバックグラウンドで起動
	docker-compose up -d

down: ## コンテナを停止・削除
	docker-compose down

restart: ## コンテナを再起動
	docker-compose restart

build: ## イメージを再ビルド
	docker-compose build

rebuild: ## イメージを再ビルドして起動
	docker-compose up --build

logs: ## ログを表示
	docker-compose logs -f

clean: ## コンテナ、イメージ、ボリュームを削除
	docker-compose down -v --rmi all

ps: ## コンテナの状態を表示
	docker-compose ps

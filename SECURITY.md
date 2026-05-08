# Security Policy

## Supported Versions

このプロジェクトは開発中のため、最新の `main` 相当ブランチのみをサポート対象とします。

## Reporting a Vulnerability

脆弱性を発見した場合は、公開Issueではなくメンテナーへ直接連絡してください。  
再現手順・影響範囲・PoC（可能なら）を添えて報告をお願いします。

## Secret Management Rules

- APIキーやトークンは**クライアントコードに埋め込まない**。
- `.env*` ファイルはGit管理に含めない（`.env.example` のみ共有）。
- キー漏えい時はただちに失効・再発行する。

## Free Security Baseline Checklist

以下を定期実行してください（無料で実施可能）:

1. `npm run audit`
2. `npm run lint`
3. `npm run build`
4. 依存関係の更新可否確認（`npm outdated`）

## Environment Proxy Warning

`npm warn Unknown env config "http-proxy"` は、リポジトリ内設定ではなく環境変数由来の場合があります。  
不要な場合はシェル/CI側で次を削除してください。

```bash
unset npm_config_http_proxy
unset npm_config_https_proxy
```

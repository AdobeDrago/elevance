# AEM Block Collection

This project provides a foundation for starting an AEM Edge Delivery Services project. It includes many common blocks and features a project might need.

## DA compatible

This specific repo has been _slightly_ modified to be compatible with DA's live preview.

## Author documentation

See the [site author guide](docs/author-guide.html) for page metadata, shared header
and footer editing, all 34 blocks and their supported options, authoring table
examples, and an NC page reference. Browse it locally at
<http://localhost:3000/docs/author-guide.html> with the development server running.
After pushing the documentation and deploying it through Code Sync, use
`/docs/author-guide.html` on the site's preview or live host. Keep the `.html`
extension; the extensionless route resolves through DA content instead.

## Getting started

### 1. Github
1. Use this template to make a new repo.
1. Install [AEM Code Sync](https://github.com/apps/aem-code-sync).

### 2. DA content
1. Browse to https://da.live/start.
2. Follow the steps.

### 3. Local development
1. Clone your new repo to your computer.
1. Install the AEM CLI using your terminal: `sudo npm install -g @adobe/aem-cli`
1. Start the NC preview:
   `aem up --port 3000 --url https://main--elevance-nc--adobedrago.aem.page --no-stop-other`.
1. Open `http://localhost:3000/north-carolina-provider/home`.
   Override `--port` locally if another project is using the default port.
1. Open the `{repo}` folder in your favorite code editor and build something.
1. **Recommended:** Install common npm packages like linting and testing: `npm i`.

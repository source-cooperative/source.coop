# Source Cooperative Frontend & API

This repository contains the Next.JS application which hosts the Source Cooperative frontend and API.

## Getting Started

### Prerequisites

- Docker installed and running locally
- NPM installed on your local machine
- AWS CLI installed on your local machine

Ensure the AWS CLI is configured (even if the values don't matter) by running, e.g.:

```bash
$ aws configure
AWS Access Key ID [None]: dummy
AWS Secret Access Key [None]: dummy
Default region name [None]: us-east-1
Default output format [None]:
```

### Install Dependencies

To install the dependencies, run the following command:

```
npm install
```

### Installing the Source Cooperative CLI

To install the Source Cooperative CLI, run the following command:

```
npm run install-cli
```

### Setting up Ory

To set up Ory, create an [Ory](https://ory.sh) account and create a new project in the [console](https://console.ory.sh).
After creating the project, navigate to Ory Project settings tab and create a new API key within the API Keys section.
Copy the API key and set it as the `ORY_ACCESS_TOKEN` environment variable.
Next, copy the `API endpoint` URL and set it as the `ORY_SDK_URL` environment variable.

You can copy `.env.local` to `.env` and set the values inside it to avoid leaking secrets, since the latter file is not versioned. Also `.env` is loaded after `.env.local`, so it will override the values.

```bash
cp .env.local .env
vi .env
```

```bash
ORY_ACCESS_TOKEN=ory_pat_xxxxx
ORY_SDK_URL=https://[PROJECT_SLUG].projects.oryapis.com
```

The `PROJECT_SLUG` for your Ory project can be found on the main "Project settings" page in the Ory console.

### Run Locally

After having set up your environment variables, run the following command to start the service locally:

```
npm run dev
```

You can now access the service at [http://localhost:3000](http://localhost:3000).

You can also check that the was correctly initialized by running the following command and ensuring it contains a non-empty list of tables:

```
aws dynamodb list-tables --page-size 1 --endpoint-url=http://localhost:8000
```

Now, make sure that you have the [Source Cooperative Data Proxy](https://github.com/source-cooperative/data.source.coop) running locally as well.

### Resetting the Database

To reset the database, stop the local webserver and run the following CLI command:

```
npm run kill
```

You will need to restart the local webserver after running this command.


## Running Tests

To run the tests, run the following command:

```
npm run test
```

## Deployment

Any commits pushed to the `main` branch will be automatically deployed via Vercel.

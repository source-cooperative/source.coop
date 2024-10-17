# Source Cooperative Frontend & API

This repository contains the Next.JS application which hosts the Source Cooperative frontend and API.

## Getting Started

### Prerequisites
 - Docker installed and running locally
 - NPM installed on your local machine

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

To set up Ory, create an [Ory](https://ory.sh) and create a new project in the [console](https://console.ory.sh).
After creating the project, navigate to the project settings and create a new API key.
Copy the API key and set it as the `ORY_ACCESS_TOKEN` environment variable.
Next, copy the `API endpoint` URL and set it as the `ORY_SDK_URL` environment variable.

### Run Locally

After having set up your environment variables, run the following command to start the service locally:

```
npm run dev
```

You can now access the service at [http://localhost:3000](http://localhost:3000)


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

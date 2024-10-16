# Source Cooperative Frontend & API

This repository contains the Next.JS application which hosts the Source Cooperative frontend and API.

## Getting Started

### Prerequisites
 - Docker installed and running locally
 - An ory account and project set up for local development
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

### Dumping Data

In order to populate the local DynamoDB instance, you must first dump the data from the production database. To do this, run the following CLI command:

```
sc dump dump --production
```

### Environment Variable Setup

Run the following terminal commands to set up your environment variables.

```
export ORY_SDK_URL=<DEVELOPMENT_ORY_API_URL_HERE>
export ORY_ACCESS_TOKEN=<YOUR_ORY_ACCESS_TOKEN_HERE>
```

### Run Locally

After having set up your environment variables, run the following command to start the service locally:

```
npm run dev
```

### Load Data

You can populate the local DynamoDB database with the dump you created earlier by running the following CLI command:
```
sc load dump
```

You can now access the service at [http://localhost:3000](http://localhost:3000)


### Resetting the Database

To reset the database, stop the local webserver and run the following CLI command:

```
npm run kill
```

You will need to restart the local webserver and repopulate the database after running this command.


## Running Tests

To run the tests, run the following command:

```
npm run test
```

## Deployment

Any commits pushed to the `main` branch will be automatically deployed via Vercel.

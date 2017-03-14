## What?

This is a lib that makes it quick and easy to set up an in-process job queue. It's tightly coupled to Sequelize and Postgres so if that isn't your persistence layer, look elsewhere.

You won't get as robust a solution as you could build on top of an actual distributed message queue, but it'll get you out of a tight spot. It's safe for multiple publishers and consumers to run against concurrently.

## How?

Take a look at `example/src/jobs/index.js`. It's an example of a way to drive the helper. It's designed to, in turn, be driven by `example/bin.js`.

There are also example model and migration files in the `example` dir.

## Where?

`npm install job_helper`

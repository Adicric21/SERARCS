# API surface

## Health

`GET /api/health`

Checks PostgreSQL connectivity and bootstraps the demo schema.

## Dashboard

`GET /api/dashboard`

Returns active/resolved requests, crews, event feed and operational statistics.

## Requests

`GET /api/requests`

Returns active and resolved requests.

`POST /api/requests`

Creates a new SOS.

`GET /api/requests/:id`

Returns the request, event timeline, crew list and live queue position.

## Request actions

`POST /api/requests/:id/actions`

Supported actions:

- `claim`
- `status`
- `resolve`
- `release`
- `note`

## Priorities

`POST /api/priorities/refresh`

Forces a backend recalculation of active request priorities.

## Crews

`GET /api/crews`

Returns crew availability and active assignments.

## History

`GET /api/history`

Returns historical requests and the operational event log.

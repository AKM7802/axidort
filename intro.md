We are building a lead generation system, which provides active leads to the clients who are registered.


Different services to be generated are 


Service 1 

- Fetches raw data from api of the area
- Convert to Speciefied Schema
- Store in DB
- Classify the text into categories using llm
- Update the categories and other details of the db
- Sore the data into vioations model if any vioations are present and is a potential lead


Service 2

- Get the users who needs email today
- Fetch the last 7 days of leads data from the db
- Maps the events to the clients and store it in a seperate db on many-many- basis
- Send the emails to the users email and mark it in the db



API Service

- User Registration - signup, signin, payment endpoints
- User Detail registration form
- User And Admin dashboard



For V1, we are using the chicago endpoint, the endpoint response data can defer per cities, so create adpater for various city, for now chicago is enough, Create a well defined generalised schema which captures all data we need from the raw data that must be generalized and also store the original data in a raw data columns as well.

Use Python for creating services and Fast api for endpoint, resend api for sending email

Use the specified models below 
table territories (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id),
  kind text not null,                     -- 'zip'|'borough'|'local_authority'|'radius'
  value text not null                     -- '11385' | 'Queens' | 'Ealing' | '43.65,-79.38,15km'
);

create table violations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references inspection_events(id),
  code_raw text, description_raw text,
  category text not null,                 -- 'pest'|'sanitation'|'equipment'|'plumbing'|'temperature'|'other'
  species text[],                         -- ['rodent','roach','fly'] when category='pest'
  severity text not null,                 -- 'closure'|'critical'|'citation'|'conducive'
  critical boolean not null default false,
  ai_confidence numeric,                  -- from classifier; <0.8 rows also land in review_queue
  classifier_version text not null        -- e.g. 'classify_v1'
);


CHICAGO Data api Docs
https://dev.socrata.com/

Endpoint : https://data.cityofchicago.org/resource/4ijn-s7e5.json?$where=inspection_date >= '2026-07-28T00:00:00'&$limit=5000
Now
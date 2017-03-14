CREATE USER job_helper;
ALTER USER job_helper WITH SUPERUSER;
CREATE DATABASE job_helper_testing;
GRANT ALL PRIVILEGES ON DATABASE job_helper_testing TO job_helper;

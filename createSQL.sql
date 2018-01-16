DROP TABLE IF EXISTS signatures;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS user_profiles;

CREATE TABLE users (
    id    SERIAL primary key,
    first VARCHAR(255) not null,
    last  VARCHAR(255) not null,
    email VARCHAR(255) not null UNIQUE,
    password VARCHAR(100) not null,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_profiles (
    id    SERIAL primary key,
    userid INTEGER not null,
    age INTEGER,
    city  VARCHAR(255),
    url VARCHAR(255),
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE signatures (
    id    SERIAL primary key,
    userid INTEGER not null UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    signature TEXT not null,
    createdate TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

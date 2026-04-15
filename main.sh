#!/bin/bash

export GIT_REPOSITORY_URL= "git_url"

echo "Cloning repository...................."
git clone "$GIT_REPOSITORY_URL" /home/app/output

echo "Clone complete......................."
exec node script.js

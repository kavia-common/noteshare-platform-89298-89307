#!/bin/bash
cd /home/kavia/workspace/code-generation/noteshare-platform-89298-89307/react_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi


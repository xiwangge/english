#!/bin/bash

# --- International Frontend Deployment Script ---
# Follows the template of the main backend deployment script

# --- Configuration ---
SERVER_USER="ubuntu"
SERVER_IP="43.132.229.214"
REMOTE_PATH="/var/www/international-frontend"

# --- Script Variables ---
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
PACKAGE_NAME="intl-frontend-deploy-${TIMESTAMP}.tar.gz"

echo "=== Starting International Frontend Deployment ==="

# 1. Build project
echo "--> 1. Installing dependencies and building project..."
npm install
npm run build

if [ $? -ne 0 ]; then
    echo "Build failed."
    exit 1
fi

# 2. Package dist folder
echo "--> 2. Packaging dist folder..."
tar -czf ${PACKAGE_NAME} -C dist .

if [ $? -ne 0 ]; then
    echo "Packaging failed."
    exit 1
fi
echo "--> Package created: ${PACKAGE_NAME}"

# 3. Upload to server
echo "--> 3. Uploading to server ${SERVER_USER}@${SERVER_IP}..."
ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${REMOTE_PATH}"
scp ${PACKAGE_NAME} ${SERVER_USER}@${SERVER_IP}:${REMOTE_PATH}/${PACKAGE_NAME}

if [ $? -ne 0 ]; then
    echo "Upload failed."
    rm ${PACKAGE_NAME}
    exit 1
fi
echo "--> Upload successful."

# 4. Remote execution
echo "--> 4. Extracting on server..."
ssh ${SERVER_USER}@${SERVER_IP} << EOF
    cd ${REMOTE_PATH}
    echo "--> Clearing old files..."
    # Optionally: find . -maxdepth 1 ! -name '${PACKAGE_NAME}' -exec rm -rf {} +
    
    echo "--> Extracting new files..."
    tar -xzf ${PACKAGE_NAME}
    
    echo "--> Cleaning up old package..."
    rm ${PACKAGE_NAME}
    
    echo "=== Remote Extraction Complete! ==="
EOF

if [ $? -ne 0 ]; then
    echo "Remote execution failed."
    rm ${PACKAGE_NAME}
    exit 1
fi

# 5. Local cleanup
echo "--> 5. Cleaning up local temporary files..."
rm ${PACKAGE_NAME}

echo "=== Deployment Script Finished ==="


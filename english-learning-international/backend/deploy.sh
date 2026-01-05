#!/bin/bash

# --- International Backend Deployment Script ---
# Simplified version of the main backend deployment script

# --- Configuration ---
SERVER_USER="ubuntu"
SERVER_IP="43.132.229.214"
DEPLOY_DIR="/var/www/international-backend"
APP_NAME="international-backend"

# --- Script Variables ---
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
PACKAGE_NAME="intl-backend-deploy-${TIMESTAMP}.tar.gz"

echo "=== Starting International Backend Deployment ==="

# 1. Package files
echo "--> 1. Packaging project files..."
TEMP_DIR="backend-deploy-tmp"
mkdir -p ${TEMP_DIR}/packages

# Copy necessary files
cp index.js package.json ip2region_v4.xdb ${TEMP_DIR}/
# Copy common package
cp -R ../../packages/common ${TEMP_DIR}/packages/

# Pack
tar -czf ${PACKAGE_NAME} -C ${TEMP_DIR} .
rm -rf ${TEMP_DIR}

if [ $? -ne 0 ]; then
    echo "Packaging failed."
    exit 1
fi
echo "--> Package created: ${PACKAGE_NAME}"

# 2. Upload to server
echo "--> 2. Uploading to server ${SERVER_USER}@${SERVER_IP}..."
ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${DEPLOY_DIR}"
scp ${PACKAGE_NAME} ${SERVER_USER}@${SERVER_IP}:${DEPLOY_DIR}/${PACKAGE_NAME}

if [ $? -ne 0 ]; then
    echo "Upload failed."
    rm ${PACKAGE_NAME}
    exit 1
fi
echo "--> Upload successful."

# 3. Remote execution
echo "--> 3. Executing deployment on server..."
ssh ${SERVER_USER}@${SERVER_IP} << EOF
    cd ${DEPLOY_DIR}
    echo "--> Extracting files..."
    tar -xzf ${PACKAGE_NAME}
    
    echo "--> Installing dependencies..."
    # Fix path for common package in package.json
    sed -i 's|"file:../../packages/common"|"file:packages/common"|g' package.json
    npm install --production

    echo "--> Restarting app via PM2..."
    pm2 reload ${APP_NAME} || pm2 start index.js --name "${APP_NAME}"
    
    echo "--> Cleaning up old package..."
    rm ${PACKAGE_NAME}
    
    echo "=== Remote Deployment Complete! ==="
    pm2 list
EOF

if [ $? -ne 0 ]; then
    echo "Remote execution failed."
    rm ${PACKAGE_NAME}
    exit 1
fi

# 4. Local cleanup
echo "--> 4. Cleaning up local temporary files..."
rm ${PACKAGE_NAME}

echo "=== Deployment Script Finished ==="

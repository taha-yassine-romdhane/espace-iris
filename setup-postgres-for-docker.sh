#!/bin/bash
# Script to configure PostgreSQL to accept connections from Docker containers

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    echo "This script must be run as root. Please use sudo."
    exit 1
fi

# Path to PostgreSQL configuration file
PG_CONF="/etc/postgresql/15/main/postgresql.conf"
PG_HBA="/etc/postgresql/15/main/pg_hba.conf"

# Backup original files
cp $PG_CONF "${PG_CONF}.bak"
cp $PG_HBA "${PG_HBA}.bak"

echo "Backing up PostgreSQL configuration files..."
echo "Original files saved as ${PG_CONF}.bak and ${PG_HBA}.bak"

# Modify postgresql.conf to listen on all interfaces
echo "Configuring PostgreSQL to listen on all interfaces..."
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" $PG_CONF

# Add entry to pg_hba.conf to allow connections from Docker subnet
echo "Adding Docker subnet to pg_hba.conf..."
echo "# Allow Docker containers to connect to PostgreSQL" >> $PG_HBA
echo "host    all             all             172.17.0.0/16           md5" >> $PG_HBA
echo "host    all             all             0.0.0.0/0               md5" >> $PG_HBA

# Restart PostgreSQL service
echo "Restarting PostgreSQL service..."
systemctl restart postgresql

# Verify PostgreSQL is listening on all interfaces
echo "Verifying PostgreSQL configuration..."
netstat -tulnp | grep postgres

echo "PostgreSQL has been configured to accept connections from Docker containers."
echo "Please check that PostgreSQL is listening on 0.0.0.0:5432"
echo "You may need to update your firewall rules if you have a firewall enabled."

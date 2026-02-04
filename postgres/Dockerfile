FROM postgres:15

# Install EFS utils and other utilities
RUN apt-get update && apt-get install -y \
    nfs-common \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create data directory for EFS mount
RUN mkdir -p /var/lib/postgresql/data && \
    chown -R postgres:postgres /var/lib/postgresql

# Expose PostgreSQL port
EXPOSE 5432

# Use default PostgreSQL entrypoint
CMD ["postgres"]

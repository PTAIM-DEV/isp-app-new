docker exec isp-postgres pg_dump -U postgres -d isp_app -F c > db/isp_app_backup.dump
./rsync-to-server.sh gotable:/home/gastra/projects/isp-app/

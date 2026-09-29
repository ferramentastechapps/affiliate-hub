#!/bin/bash
python3 -c "
import re
for path in ['/root/affiliate-hub/.env', '/root/affiliate-hub/bot/.env']:
    try:
        content = open(path).read()
        content = re.sub(r'SEARCH_INTERVAL_MINUTES=.*', 'SEARCH_INTERVAL_MINUTES=5', content)
        open(path, 'w').write(content)
        print(f'Updated: {path}')
    except Exception as e:
        print(f'Error {path}: {e}')
"
grep SEARCH_INTERVAL /root/affiliate-hub/.env /root/affiliate-hub/bot/.env
pm2 restart affiliate-scraper
echo "Done!"

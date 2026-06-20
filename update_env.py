import os
import re

env_path = '.env'
if not os.path.exists(env_path):
    print(".env not found")
    exit(1)

with open(env_path, 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.startswith('MERCADOLIVRE_TAG='):
        new_lines.append('MERCADOLIVRE_TAG="57548960"\n')
    elif line.startswith('MERCADOLIVRE_WORD='):
        pass # Remove existing
    else:
        new_lines.append(line)

new_lines.append('MERCADOLIVRE_WORD="jotashopcases"\n')

with open(env_path, 'w') as f:
    f.writelines(new_lines)

print("Updated .env!")

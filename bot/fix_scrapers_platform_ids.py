#!/usr/bin/env python3
"""
Script para atualizar todas as ocorrências de produtos.append()
para incluir platformType e platformId
"""

import re

def fix_scrapers():
    with open('scrapers.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Padrão: encontrar blocos onde temos:
    # source, ext_id = self.extrair_platform_id(...)
    # produtos.append({
    #    ...
    #    'source': source,
    #    'externalId': ext_id
    # })
    
    # Substituir source, ext_id por platform_type, platform_id
    content = re.sub(
        r'(\s+)(source, ext_id) = (self\.extrair_platform_id\([^)]+\))',
        r'\1platform_type, platform_id = \3',
        content
    )
    
    # Substituir 'source': source por 'source': 'nomeDaFonte' e adicionar platformType/platformId
    # Este é mais complexo, vamos fazer manualmente para cada fonte
    
    # Padrão para Promobyte
    content = re.sub(
        r"(\s+)'source': source,\s*\n(\s+)'externalId': ext_id",
        r"\1'source': 'promobyte',\n\1'externalId': ext_id,\n\1'platformType': platform_type,\n\1'platformId': platform_id",
        content
    )
    
    with open('scrapers.py', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print('✅ Scrapers atualizado com platformType e platformId')

if __name__ == '__main__':
    fix_scrapers()

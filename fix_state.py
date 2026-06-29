import json

state_file = '/root/affiliate-hub/bot/bot_state.json'
try:
    with open(state_file, 'r', encoding='utf-8') as f:
        state = json.load(f)
    
    fila_lifestyle = state.get('fila_lifestyle', [])
    fila_sem_lifestyle = state.get('fila_sem_lifestyle', [])
    
    novos_life = []
    
    for item in fila_lifestyle:
        p = item.get('produto', {})
        enhanced = p.get('enhancedImageUrl')
        if not enhanced or 'placeholder' in str(enhanced) or not str(enhanced).strip():
             fila_sem_lifestyle.append(item)
        else:
             novos_life.append(item)
             
    state['fila_lifestyle'] = novos_life
    state['fila_sem_lifestyle'] = fila_sem_lifestyle
    
    with open(state_file, 'w', encoding='utf-8') as f:
        json.dump(state, f, ensure_ascii=False)
        
    print(f"Estado corrigido. fila_lifestyle: {len(novos_life)}, fila_sem_lifestyle: {len(fila_sem_lifestyle)}")
except Exception as e:
    print(f"Erro ao corrigir estado: {e}")

import re

# 1. Extract styles from index.html
with open('index.html', 'r', encoding='utf-8') as f:
    index_html = f.read()

style_match = re.search(r'<style>(.*?)</style>', index_html, re.DOTALL)
if style_match:
    styles = style_match.group(1)
    # We only want the ambient shapes and animations, not nav link stuff
    # Actually, all of those styles can safely go into styles.css!
    with open('styles.css', 'a', encoding='utf-8') as f:
        f.write('\n/* Extracted from index.html */\n' + styles)
    
    # Remove from index.html
    new_index = index_html.replace(style_match.group(0), '')
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(new_index)

# 2. Get the exact background HTML from index.html
bg_html = """
    <!-- Background Gradient: Inspired by user image (Terracotta, Gold, Olive) -->
    <div class="fixed inset-0 z-0 bg-[linear-gradient(to_bottom,_#C3B89A_0%,_#AB593D_40%,_#8F6B2D_70%,_#6A6540_100%)]">
    </div>

    <!-- Inner Glow/Highlight to mimic the center spotlight effect -->
    <div class="fixed inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_50%)] pointer-events-none">
    </div>

    <!-- Ambient background shapes (ZEN & FRESH) -->
    <div id="parallax-bg" class="fixed inset-0 z-0 pointer-events-none overflow-hidden transition-transform duration-1000 ease-out">
        <div class="ambient-shape shape-1"></div>
        <div class="ambient-shape shape-2"></div>
        <div class="ambient-shape shape-3"></div>
        <div class="ambient-shape shape-4"></div>
    </div>
"""

files = ['clases.html', 'tarifas.html', 'maestros.html', 'profile.html']
for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove bg gradient from body tag
    content = re.sub(r' bg-\[linear-gradient[^\]]+\]', '', content)
    
    # Replace ambient background shapes
    content = re.sub(r'<!-- Ambient Background Shapes.*?</div>\s*</div>', bg_html, content, flags=re.DOTALL)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
        
print("Replaced backgrounds and extracted styles.")

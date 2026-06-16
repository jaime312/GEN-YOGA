import os
import glob
import re

html_files = glob.glob('*.html')

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove tailwind cdn
    content = re.sub(r'<script src="https://cdn.tailwindcss.com"></script>\s*', '', content)
    
    # Remove tailwind config script
    content = re.sub(r'<script>\s*tailwind\.config = \{[\s\S]*?\};\s*</script>\s*', '', content)
    
    # Replace styles.css with tailwind-compiled.css
    content = re.sub(r'<link rel="stylesheet" href="styles\.css(\?v=\d+)?">', '<link rel="stylesheet" href="tailwind-compiled.css">', content)
    
    # Some files might not have styles.css but we should add tailwind-compiled.css where tailwind cdn used to be if it wasn't added
    if 'tailwind-compiled.css' not in content:
        # Add it right before <title> or after <head>
        content = content.replace('</title>', '</title>\n    <link rel="stylesheet" href="tailwind-compiled.css">')
        
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done replacing.")

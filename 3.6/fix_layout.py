import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Fix the central content container
# Restore it to a cleaner version that uses standard responsive max-width based on VW to avoid overlap
old_center = r'<div\s+class="flex-grow flex-shrink flex flex-col items-center justify-center text-center w-full lg:px-\[250px\] xl:px-\[350px\] 2xl:px-\[450px\] min-h-0 space-y-\[2vh\] my-\[2vh\] z-10 px-4 animate-fade-in-up">'
new_center = '<div class="flex-grow flex-shrink flex flex-col items-center justify-center text-center w-full max-w-[90vw] lg:max-w-[50vw] xl:max-w-[45vw] 2xl:max-w-4xl min-h-0 space-y-[2vh] my-[2vh] z-10 px-4 lg:px-8 animate-fade-in-up">'
html = re.sub(old_center, new_center, html)

# Also match the original if it didn't match the new one
old_center_orig = r'<div\s+class="flex-grow flex-shrink flex flex-col items-center justify-center text-center max-w-2xl min-h-0 space-y-\[2vh\] my-\[2vh\] z-10 px-4 animate-fade-in-up">'
html = re.sub(old_center_orig, new_center, html)

# 2. Fix the font size of the absolute side navigation
# Change: text-[clamp(2rem,4vh,4rem)] xl:text-6xl -> text-[clamp(1.5rem,2.5vw,3.5rem)] xl:text-[clamp(2rem,3vw,4.5rem)]
# This makes it scale with WIDTH (vw) instead of HEIGHT (vh), which prevents overlap on narrow windows!
html = html.replace('text-[clamp(2rem,4vh,4rem)] xl:text-6xl', 'text-[clamp(1.5rem,2.5vw,3.5rem)] xl:text-[clamp(2rem,3vw,4.5rem)]')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
    
print("Layout fixed.")

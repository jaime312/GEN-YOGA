import re
import os

files = ['index.html']
for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        html = f.read()

    # Center texts
    html = html.replace('class="text-white text-[clamp(1.3rem,2.8vh,2.5rem)]', 'class="font-ubuntu text-white text-[clamp(1.3rem,2.8vh,2.5rem)]')
    html = html.replace('class="text-white font-medium md:font-normal text-[clamp(1.5rem,3.2vh,3.5rem)]', 'class="font-ubuntu text-white font-medium md:font-normal text-[clamp(1.5rem,3.2vh,3.5rem)]')

    # Mobile nav
    html = html.replace('!text-white font-medium tracking-widest text-xl', 'font-ubuntu !text-white font-medium tracking-widest text-xl')

    # Desktop nav
    html = html.replace('class="nav-link-strike text-[clamp', 'class="font-ubuntu nav-link-strike text-[clamp')

    with open(file, 'w', encoding='utf-8') as f:
        f.write(html)
        
print("Fonts updated in index.html.")

import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update side navigation gap
html = html.replace('class="hidden lg:flex flex-col items-center gap-4 absolute left-12 top-1/2 -translate-y-1/2 z-30"', 
                    'class="hidden lg:flex flex-col items-center gap-[10vh] absolute left-12 top-1/2 -translate-y-1/2 z-30"')

html = html.replace('class="hidden lg:flex flex-col items-center gap-4 absolute right-12 top-1/2 -translate-y-1/2 z-30"', 
                    'class="hidden lg:flex flex-col items-center gap-[10vh] absolute right-12 top-1/2 -translate-y-1/2 z-30"')


# 2. Remove old hover image containers
old_hover_left = r'<!-- Hover Image Spacer: Responsive height -->\s*<div id="hover-image-left"[\s\S]*?</div>\s*<button'
html = re.sub(old_hover_left, '<button', html)

old_hover_right = r'<!-- Hover Image Spacer: Responsive height -->\s*<div id="hover-image-right"[\s\S]*?</div>\s*<button'
html = re.sub(old_hover_right, '<button', html)


# 3. Update central content to include new center-hover-image-container and wrap text
central_start = r'(<div class="flex-grow flex-shrink flex flex-col items-center justify-center text-center w-full max-w-\[90vw\] lg:max-w-\[50vw\] xl:max-w-\[45vw\] 2xl:max-w-4xl min-h-0 space-y-\[2vh\] my-\[2vh\] z-10 px-4 lg:px-8 animate-fade-in-up">)'
# Change the container to relative and add id
new_central_start = r'<div class="flex-grow flex-shrink flex flex-col items-center justify-center text-center w-full max-w-[90vw] lg:max-w-[50vw] xl:max-w-[45vw] 2xl:max-w-4xl min-h-0 z-10 px-4 lg:px-8 relative">\n\n<div id="central-text-content" class="transition-all duration-700 ease-in-out flex flex-col items-center justify-center space-y-[2vh] my-[2vh] animate-fade-in-up w-full">'
html = re.sub(central_start, new_central_start, html)

# Close the central-text-content div and add the new hover container right before <!-- ============================================ -->
central_end = r'(<!-- ============================================ -->\s*<!-- MOVIL: NAVEGACIÓN)'

hover_images_html = """
    </div> <!-- close central-text-content -->

    <!-- New center hover image container -->
    <div id="center-hover-image-container" class="hover-image-container absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <img id="img-clases" src="img/clases.png" class="absolute w-[clamp(15rem,40vh,40rem)] h-[clamp(15rem,40vh,40rem)] object-contain drop-shadow-2xl hidden" alt="">
        <img id="img-tarifas" src="img/tarifas.png" class="absolute w-[clamp(15rem,40vh,40rem)] h-[clamp(15rem,40vh,40rem)] object-contain drop-shadow-2xl hidden" alt="">
        <img id="img-maestros" src="img/maestros.png" class="absolute w-[clamp(15rem,40vh,40rem)] h-[clamp(15rem,40vh,40rem)] object-contain drop-shadow-2xl hidden" alt="">
        <img id="img-perfil" src="img/miperfil.png" class="absolute w-[clamp(15rem,40vh,40rem)] h-[clamp(15rem,40vh,40rem)] object-contain drop-shadow-2xl hidden" alt="">
    </div>

    """
html = re.sub(central_end, hover_images_html + r'\1', html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Updated index.html")

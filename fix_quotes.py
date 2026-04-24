content = open('index.html', 'rb').read()

# Fix remaining garbled smart quote sequences
# \xe2\x80\x9c = LEFT DOUBLE QUOTATION MARK
# \xe2\x80\x9d = RIGHT DOUBLE QUOTATION MARK
# These often get double-encoded

# Find all occurrences of the problematic byte sequences
import re

# Replace the specific remaining issues
replacements = {
    b'\xe2\x80\x9c': b'"',   # " -> "
    b'\xe2\x80\x9d': b'"',   # " -> "
    b'\xe2\x80\x98': b"',    # ' -> '
    b'\xe2\x80\x99': b"'",    # ' -> '
}

for old, new in replacements.items():
    count = content.count(old)
    if count > 0:
        content = content.replace(old, new)
        print(f'Replaced {count}x {repr(old)} with {repr(new)}')

open('index.html', 'wb').write(content)
print('Done')

data = open('serve.js', 'rb').read()

# Find the broken upload handler
start = data.find(b"    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`")
print('await at:', start)
if start < 0:
    start = data.find(b"    const userRes = await fetch(")
print('alt await at:', start)

# Find the Serve static files marker
static_marker = b"  // Serve static files"
static_pos = data.find(static_marker)
print('Static at:', static_pos)

# Find the closing of the broken handler - the first "    }); return;" that comes before static
# Working backwards from static
search = data[:static_pos]
last_return = search.rfind(b"    }); return;")
print('Last return before static:', last_return)

# Show context
print(repr(data[last_return-20:last_return+80]))

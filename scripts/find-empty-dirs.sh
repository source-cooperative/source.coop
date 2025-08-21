#!/bin/bash

# Find empty directories in the src directory
find src -type d -empty -print

echo "These directories are empty and could potentially be removed." 
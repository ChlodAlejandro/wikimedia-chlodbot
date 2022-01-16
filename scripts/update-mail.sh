#!/bin/bash
echo "Hello!"
echo
echo "A new version of Zoomiebot was deployed on `date`."
echo
git log -1
echo
echo "If this deploy was made in error, please log into Toolforge immediately"
echo "and rectify the error. Thank you."

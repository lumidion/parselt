echo "Start"
gitref="${GITHUB_REF_NAME}"
echo $gitref
version="${gitref:1}"
echo $version
npm version $version
echo "Done"
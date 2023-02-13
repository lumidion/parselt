echo "Start"
gitref="${GITHUB_REF_NAME}"
echo $gitref
version="${GITHUB_REF_NAME:1}"
echo $version
npm version $version --no-git-tag-version
echo "Done"
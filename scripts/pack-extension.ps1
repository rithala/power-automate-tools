$dist = (Resolve-Path .\dist).Path
$pem = (Resolve-Path .\pa-tools.pem).Path

chrome.exe --pack-extension=$dist --pack-extension-key=$pem
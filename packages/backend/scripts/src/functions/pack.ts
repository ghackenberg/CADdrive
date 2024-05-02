import fs from 'fs'
import path from 'path'

import shortid from 'shortid'

const ldrawPath = 'assets/ldraw'
const materialsFileName = 'LDConfig.ldr'

const materialsFilePath = path.join(ldrawPath, materialsFileName)

let materialsContent: string = null // Set upon first pack call

export function packLDrawText(text: string) {
    const fileName = `${shortid()}.ldr`
    const absoluteObjectPath = path.join(ldrawPath, 'models/', fileName)
    
    fs.writeFileSync(absoluteObjectPath, text)

    const result = packLDrawFile(fileName)

    fs.unlinkSync(absoluteObjectPath)

    return result
}

export function packLDrawFile(fileName: string) {
    console.log('Packing "' + fileName + '"...')

    const objectsPaths: string[] = []
    const objectsContents: string[] = []
    const pathMap: {[path: string]: string} = {}
    const listOfNotFound: string[] = []

    // Parse object tree
    parseObject(fileName, true, objectsPaths, objectsContents, pathMap, listOfNotFound)

    // Check if previously files not found are found now
    // (if so, probably they were already embedded)
    let someNotFound = false
    for (let i = 0; i < listOfNotFound.length; i++) {
        if (!pathMap[listOfNotFound[i]]) {
            someNotFound = true
            console.error('Error: File object not found: "' + fileName + '".')
        }
    }
    if (someNotFound) {
        console.error('Some files were not found, aborting.')
        throw 'error'
    }

	// Loading materials content
	if (!materialsContent) {
		console.log('Loading materials file "' + materialsFilePath + '"...')
		materialsContent = fs.readFileSync(materialsFilePath, { encoding: 'utf8' })
	}

    // Obtain packed content
    let packedContent = materialsContent + '\n'
    for (let i = objectsPaths.length - 1; i >= 0; i--) {
        packedContent += objectsContents[i]
    }
    packedContent += '\n'

    // Save output file
    return packedContent
}

//
function parseObject(fileName: string, isRoot: boolean, objectsPaths: string[], objectsContents: string[], pathMap: {[path: string]: string}, listOfNotFound: string[]) {
	// Returns the located path for fileName or null if not found
	console.log('Adding "' + fileName + '".')

	const originalFileName = fileName

	let prefix = ''
	let objectContent: string = null
	for (let attempt = 0; attempt < 2; attempt++) {
		prefix = ''

		if (attempt === 1) {
			fileName = fileName.toLowerCase()
		}

		if (fileName.startsWith('48/')) {
			prefix = 'p/'
		} else if (fileName.startsWith('s/')) {
			prefix = 'parts/'
		}

		let absoluteObjectPath = path.join(ldrawPath, fileName)

		try {
			objectContent = fs.readFileSync(absoluteObjectPath, { encoding: 'utf8' })
			break
		} catch (e) {
			try {
                prefix = 'parts/'
                absoluteObjectPath = path.join(ldrawPath, prefix, fileName)
				objectContent = fs.readFileSync(absoluteObjectPath, { encoding: 'utf8' })
				break
			} catch (e) {
				try {
                    prefix = 'p/'
                    absoluteObjectPath = path.join(ldrawPath, prefix, fileName)
					objectContent = fs.readFileSync(absoluteObjectPath, { encoding: 'utf8' })
					break
				} catch (e) {
					try {
						prefix = 'models/'
						absoluteObjectPath = path.join(ldrawPath, prefix, fileName)
						objectContent = fs.readFileSync(absoluteObjectPath, { encoding: 'utf8' })
						break
					} catch (e) {
						if (attempt === 1) {
							// The file has not been found, add to list of not found
							listOfNotFound.push(originalFileName)
						}
					}
				}
			}
		}
	}

	const objectPath = path.join(prefix, fileName).trim().replace(/\\/g, '/')

	if (!objectContent) {
		// File was not found, but could be a referenced embedded file.
		return null
	}

	if (objectContent.indexOf('\r\n') !== - 1) {
		// This is faster than String.split with regex that splits on both
		objectContent = objectContent.replace(/\r\n/g, '\n')
	}

	let processedObjectContent = isRoot ? '' : '0 FILE ' + objectPath + '\n'

	const lines = objectContent.split('\n')

	for (let i = 0, n = lines.length; i < n; i ++) {
		let line = lines[i]
		let lineLength = line.length

		// Skip spaces/tabs
		let charIndex = 0
		while ((line.charAt(charIndex) === ' ' || line.charAt(charIndex) === '\t') && charIndex < lineLength) {
			charIndex++
		}

		line = line.substring(charIndex)
		lineLength = line.length
		charIndex = 0

		if (line.startsWith('0 FILE ')) {
			if (i === 0) {
				// Ignore first line FILE meta directive
				continue
			}

			// Embedded object was found, add to path map
			const subobjectFileName = line.substring(charIndex).trim().replace(/\\/g, '/')

			if (subobjectFileName) {
				// Find name in path cache
				const subobjectPath = pathMap[subobjectFileName]

				if (!subobjectPath) {
					pathMap[subobjectFileName] = subobjectFileName
				}
			}
		}

		if (line.startsWith('1 ')) {
			// Subobject, add it
			charIndex = 2

			// Skip material, position and transform
			for (let token = 0; token < 13 && charIndex < lineLength; token ++) {
				// Skip token
				while (line.charAt(charIndex) !== ' ' && line.charAt(charIndex) !== '\t' && charIndex < lineLength) {
					charIndex++
                }
				// Skip spaces/tabs
				while ((line.charAt(charIndex) === ' ' || line.charAt(charIndex) === '\t') && charIndex < lineLength) {
					charIndex++
				}
			}

			const subobjectFileName = line.substring( charIndex ).trim().replace(/\\/g, '/')

			if (subobjectFileName) {
				// Find name in path cache
				let subobjectPath = pathMap[subobjectFileName]

				if (!subobjectPath) {
					// Add new object
					subobjectPath = parseObject(subobjectFileName, false, objectsPaths, objectsContents, pathMap, listOfNotFound)
				}

				pathMap[subobjectFileName] = subobjectPath ? subobjectPath : subobjectFileName

				processedObjectContent += line.substring(0, charIndex) + pathMap[subobjectFileName] + '\n'
			}
		} else {
			processedObjectContent += line + '\n'
		}
	}

	if (objectsPaths.indexOf(objectPath) < 0) {
		objectsPaths.push(objectPath)
		objectsContents.push(processedObjectContent)
	}

	return objectPath
}
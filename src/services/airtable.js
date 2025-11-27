import Airtable from 'airtable'

const apiKey = import.meta.env.VITE_AIRTABLE_API_KEY
const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID

let base = null

if (apiKey && baseId) {
    console.log('Airtable configured with Base ID:', baseId)
    Airtable.configure({
        apiKey: apiKey,
        endpointUrl: 'https://api.airtable.com',
    })
    base = Airtable.base(baseId)
} else {
    console.warn('Airtable configuration missing. API Key:', !!apiKey, 'Base ID:', !!baseId)
}

export const isAirtableConfigured = () => !!base

export const fetchAirtableData = async () => {
    if (!base) throw new Error('Airtable not configured')

    try {
        // 1. Fetch Tracks
        const tracksRecords = await base('Tracks').select({
            view: 'Grid view'
        }).all()

        const tracks = tracksRecords.map(record => ({
            id: record.get('Slug') || record.id,
            title: record.get('Title'),
            description: record.get('Description'),
            color: record.get('Color'),
            focus: record.get('Focus'),
            lead: record.get('Lead')
        }))

        // 2. Fetch Tutorials
        const tutorialsRecords = await base('Tutorials').select({
            view: 'Grid view'
        }).all()

        // 3. Fetch Resources
        const resourcesRecords = await base('Resources').select({
            view: 'Grid view'
        }).all()

        const resourcesMap = {} // tutorialId -> [links]
        resourcesRecords.forEach(r => {
            const tutorialLinks = r.get('Tutorials') || []
            tutorialLinks.forEach(tId => {
                if (!resourcesMap[tId]) resourcesMap[tId] = []
                resourcesMap[tId].push({
                    label: r.get('Label'),
                    url: r.get('URL')
                })
            })
        })

        const tutorials = tutorialsRecords.map(record => {
            const trackLinks = record.get('Tracks') || []
            // Find track ID by matching the record ID of the linked track
            // Wait, Airtable returns array of record IDs for linked fields.
            // We need to map that back to our track "Slug" or just use the first one.
            // But we don't have the track record ID -> Slug map easily unless we build it.

            return {
                id: record.get('Slug') || record.id,
                trackId: null, // We need to resolve this
                _trackRecordIds: trackLinks,
                _precedentRecordIds: record.get('Precedent') || [], // Store precedent record IDs
                title: record.get('Title'),
                summary: record.get('Summary'),
                status: record.get('Status'),
                level: record.get('Level'),
                duration: record.get('Duration'),
                tags: record.get('Tags') || [],
                owner: record.get('Owner'),
                highlight: record.get('Highlight'),
                coverImage: record.get('CoverImage') ? record.get('CoverImage')[0]?.url : null,
                precedent: [], // Will populate after mapping
                links: [] // Will populate
            }
        })

        // Resolve relationships
        // Map Track Record ID -> Track Slug
        const trackRecordIdToSlug = {}
        tracksRecords.forEach(r => {
            trackRecordIdToSlug[r.id] = r.get('Slug') || r.id
        })

        // Map Tutorial Record ID -> Tutorial Object (to attach links)
        const tutorialRecordIdToObj = {}
        tutorials.forEach((t, idx) => {
            tutorialRecordIdToObj[tutorialsRecords[idx].id] = t
        })

        // Fix Track IDs in Tutorials
        tutorials.forEach(t => {
            if (t._trackRecordIds && t._trackRecordIds.length > 0) {
                t.trackId = trackRecordIdToSlug[t._trackRecordIds[0]]
            }
            delete t._trackRecordIds

            // Map precedent record IDs to tutorial IDs
            if (t._precedentRecordIds && t._precedentRecordIds.length > 0) {
                t.precedent = t._precedentRecordIds
                    .map(recordId => tutorialRecordIdToObj[recordId]?.id)
                    .filter(Boolean)
            }
            delete t._precedentRecordIds
        })

        // Attach Links to Tutorials
        resourcesRecords.forEach(r => {
            const tutorialLinks = r.get('Tutorials') || []
            tutorialLinks.forEach(tRecordId => {
                const tutorial = tutorialRecordIdToObj[tRecordId]
                if (tutorial) {
                    tutorial.links.push({
                        label: r.get('Label'),
                        url: r.get('URL')
                    })
                }
            })
        })

        // Deduplicate tutorials by Title to prevent multiple nodes for the same content
        const uniqueTutorials = []
        const seenTitles = new Set()

        tutorials.forEach(t => {
            const normalizedTitle = (t.title || '').trim().toLowerCase()
            if (normalizedTitle && !seenTitles.has(normalizedTitle)) {
                seenTitles.add(normalizedTitle)
                uniqueTutorials.push(t)
            } else if (!normalizedTitle) {
                // Keep untitled ones? Maybe, using ID as uniqueness
                uniqueTutorials.push(t)
            }
        })

        return { tracks, tutorials: uniqueTutorials }

    } catch (error) {
        console.error('Error fetching from Airtable:', error)
        throw error
    }
}

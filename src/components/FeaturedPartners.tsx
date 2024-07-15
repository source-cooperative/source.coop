import { useFeatured } from "@/lib/api";
import { RepositoryListing } from "@/components/RepositoryListing";
import { Heading, Grid, Box, Link, Flex } from "theme-ui";
import Image from "next/image";
import { useColorMode } from 'theme-ui'

const SCALING_FACTOR = 1.2;

const parnters = [
    {
        "name": "NASA",
        "href": "https://www.nasa.gov/",
        "image": {
            "light": "/logos/nasa.png",
            "dark": "/logos/nasa.png"
        },
        "size": {
            "width": 168,
            "height": 140
        }
    },
    {
        "name": "Planet",
        "href": "https://www.planet.com/",
        "image": {
            "light": "/logos/planet.png",
            "dark": "/logos/planet_dark.png"
        },
        "size": {
            "width": 205,
            "height": 100
        }
    },
    {
        "name": "Vida",
        "href": "https://www.vida.place/",
        "image": {
            "light": "/logos/vida.png",
            "dark": "/logos/vida_dark.png"
        },
        "size": {
            "width": 166,
            "height": 43
        }
    },
    {
        "name": "MAXAR",
        "href": "https://www.maxar.com/",
        "image": {
            "light": "/logos/maxar.png",
            "dark": "/logos/maxar.png"
        },
        "size": {
            "width": 228,
            "height": 41
        }
    },
    {
        "name": "Ordinance Survey",
        "href": "https://www.ordnancesurvey.co.uk/",
        "image": {
            "light": "/logos/ordinance_survey.png",
            "dark": "/logos/ordinance_survey.png"
        },
        "size": {
            "width": 203,
            "height": 50
        }
    }
]

export default function FeaturedPartners() {
    const [colorMode, setColorMode] = useColorMode(); 

    return (
        <Box>
        <Heading as="h1" sx={{textAlign: "center"}}>Data Providers</Heading>
        <Flex sx={{gap: 5, alignItems: "center", justifyContent: "center", flexWrap: "wrap"}}>
            {
                parnters.map((partner, i) => {
                    return (
                        <Link href={partner.href} key={`partner-${i}`}>
                            <Flex sx={{justifyContent: "center", height: "100%", alignItems: "center"}}>
                                <Image src={colorMode == "dark" ? partner.image.dark : partner.image.light} alt={partner.name} width={partner.size.width * SCALING_FACTOR} height={partner.size.height * SCALING_FACTOR}/>
                            </Flex>
                        </Link>
                    )
                })
            }
        </Flex>
        </Box>
    )

    
}
import SVG from '@source-cooperative/components/SVG.js';

export default function InfoIcon({ ...props }) {
    return (
        <SVG viewBox="0 0 16 16" { ...props }>
            <g>
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
            </g>
        </SVG>
    )
}
/*
export function Info({ ...props }) {
    return (
        <SVG viewBox="0 0 16 16" {...props}>
        <g>
        <path d="m0,0h16v16H0V0Zm8.93,6.59l-2.29.29-.08.38.45.08c.29.07.35.18.29.47l-.74,3.47c-.19.9.11,1.32.81,1.32.55,0,1.18-.25,1.46-.6l.09-.42c-.2.18-.49.25-.69.25-.28,0-.38-.19-.3-.53l1-4.71Zm-.93-1.09c.55,0,1-.45,1-1s-.45-1-1-1-1,.45-1,1,.45,1,1,1Z"/>
        </g>
        </SVG>
    )
}
*/